/**
 * Statamic Prev/Next addon
 * Adds previous/next navigation buttons to the entry edit toolbar.
 */
(function () {
    const ROOT_CLASS = 'sennik-prev-next-root';
    const ENTRY_PATH_RE = /\/cp\/collections\/([^\/]+)\/entries\/([^\/?#]+)/;
    const DEBUG = true;

    function log() {
        if (DEBUG) console.log('[prev-next]', ...arguments);
    }

    function getConfig(key, fallback) {
        try {
            if (window.StatamicConfig && key in window.StatamicConfig) return window.StatamicConfig[key];
        } catch (e) {}
        return fallback;
    }

    function t(key, replacements) {
        replacements = replacements || {};
        const strings = getConfig('sennikPrevNext', {});
        let str = strings[key] || key;
        for (const k in replacements) {
            str = str.replace(new RegExp(':' + k, 'g'), replacements[k]);
        }
        return str;
    }

    function detectEntryRoute() {
        const m = window.location.pathname.match(ENTRY_PATH_RE);
        if (!m) return null;
        return { collection: decodeURIComponent(m[1]), entry: decodeURIComponent(m[2]) };
    }

    function getCpUrl() {
        return getConfig('cpUrl', '/cp');
    }

    async function fetchNeighbors(route) {
        const url = getCpUrl() + '/prev-next/' + route.collection + '/' + route.entry;
        log('fetching', url);
        const res = await fetch(url, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': getConfig('csrfToken', '')
            },
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }

    function findToolbar() {
        const header = document.querySelector('header[data-ui-header]');
        if (!header) {
            log('no header[data-ui-header] found');
            return null;
        }
        const directDivs = Array.from(header.children).filter(c => c.tagName === 'DIV');
        const last = directDivs[directDivs.length - 1] || null;
        if (!last) log('no div children in header');
        return last;
    }

    function chevronLeftSvg() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/></svg>';
    }

    function chevronRightSvg() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/></svg>';
    }

    /**
     * Navigate using Inertia's SPA router if available, else fall back to full reload.
     */
    function navigate(url) {
        // Statamic's Vue app exposes Inertia as a global property
        const inertiaRouter =
            window.Statamic?.$app?.config?.globalProperties?.$inertia
            || window.Inertia
            || window.__inertia__;

        if (inertiaRouter && typeof inertiaRouter.visit === 'function') {
            log('SPA navigate via Inertia router');
            inertiaRouter.visit(url);
            return;
        }
        if (inertiaRouter && typeof inertiaRouter.get === 'function') {
            log('SPA navigate via router.get');
            inertiaRouter.get(url);
            return;
        }

        log('Inertia router not found, full page reload');
        window.location.href = url;
    }

    function buildContainer(data) {
        const root = document.createElement('div');
        root.className = ROOT_CLASS;
        root.setAttribute('data-prev-next', '');
        root.style.cssText = 'display: inline-flex; align-items: center; gap: 0.5rem; margin-right: 0.5rem;';

        const makeBtn = (target, isPrev) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const disabled = !target;
            btn.style.cssText = [
                'display: inline-flex',
                'align-items: center',
                'justify-content: center',
                'min-width: 36px',
                'height: 36px',
                'padding: 0 .5rem',
                'border-radius: 0.375rem',
                'border: 1px solid rgb(229 231 235)',
                'background: white',
                'color: rgb(75 85 99)',
                'cursor: ' + (disabled ? 'not-allowed' : 'pointer'),
                'opacity: ' + (disabled ? '0.4' : '1'),
            ].join(';');
            btn.innerHTML = isPrev ? chevronLeftSvg() : chevronRightSvg();

            if (target) {
                btn.title = (isPrev ? t('previous') : t('next')) + ': ' + target.title;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigate(target.edit_url);
                });
                btn.addEventListener('mouseenter', () => { btn.style.background = 'rgb(243 244 246)'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = 'white'; });
            } else {
                btn.disabled = true;
                btn.title = isPrev ? t('no_previous') : t('no_next');
            }
            return btn;
        };

        const counter = document.createElement('span');
        counter.style.cssText = 'font-size: 0.875rem; color: rgb(75 85 99); min-width: 60px; text-align: center; font-variant-numeric: tabular-nums;';
        counter.textContent = t('position', { current: data.position, total: data.total });

        root.appendChild(makeBtn(data.prev, true));
        root.appendChild(counter);
        root.appendChild(makeBtn(data.next, false));
        return root;
    }

    function alreadyInjected() {
        return !!document.querySelector('.' + ROOT_CLASS);
    }

    function removeInjected() {
        const els = document.querySelectorAll('.' + ROOT_CLASS);
        els.forEach(el => el.remove());
    }

    let lastEntryKey = null;
    let injecting = false;

    async function inject() {
        if (injecting) return;
        const route = detectEntryRoute();
        if (!route) {
            removeInjected();
            lastEntryKey = null;
            return;
        }

        const key = route.collection + '/' + route.entry;
        const toolbar = findToolbar();
        if (!toolbar) return; // wait for next mutation

        if (key === lastEntryKey && alreadyInjected()) return;

        injecting = true;
        try {
            log('injecting for', key);
            const data = await fetchNeighbors(route);

            const recheck = detectEntryRoute();
            if (!recheck || (recheck.collection + '/' + recheck.entry) !== key) {
                log('navigated away during fetch');
                return;
            }

            removeInjected();
            const targetToolbar = findToolbar();
            if (!targetToolbar) return;

            const node = buildContainer(data);
            targetToolbar.insertBefore(node, targetToolbar.firstChild);
            lastEntryKey = key;
            log('injected ✓ pos', data.position, '/', data.total);
        } catch (e) {
            console.error('[prev-next] failed:', e);
        } finally {
            injecting = false;
        }
    }

    function start() {
        log('starting, readyState=', document.readyState, 'pathname=', window.location.pathname);

        // Observer: catches both initial mount and Inertia navigations
        const observer = new MutationObserver(() => {
            const route = detectEntryRoute();
            const currentKey = route ? (route.collection + '/' + route.entry) : null;
            if (currentKey !== lastEntryKey) {
                inject();
            } else if (currentKey && !alreadyInjected() && findToolbar()) {
                inject();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Try immediately too
        inject();

        // Polling fallback (in case observer misses something on slow loads)
        let polls = 0;
        const interval = setInterval(() => {
            polls++;
            if (alreadyInjected() || polls > 30) {
                clearInterval(interval);
                return;
            }
            const route = detectEntryRoute();
            if (route && findToolbar() && !alreadyInjected()) {
                inject();
            }
        }, 200);

        // Browser back/forward
        window.addEventListener('popstate', () => setTimeout(inject, 100));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
