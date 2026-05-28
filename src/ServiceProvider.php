<?php

namespace Sennik\PrevNext;

use Statamic\Facades\CP\Nav;
use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $scripts = [
        __DIR__ . '/../resources/js/prev-next.js',
    ];

    protected $routes = [
        'cp' => __DIR__ . '/../routes/cp.php',
    ];

    public function bootAddon()
    {
        $this->loadTranslationsFrom(
            __DIR__ . '/../resources/lang',
            'sennik-prev-next'
        );

        $this->publishes([
            __DIR__ . '/../resources/lang' => $this->app->langPath('vendor/sennik-prev-next'),
        ], 'sennik-prev-next-lang');

        Statamic::provideToScript([
            'sennikPrevNext' => [
                'previous'    => __('sennik-prev-next::strings.previous'),
                'next'        => __('sennik-prev-next::strings.next'),
                'position'    => __('sennik-prev-next::strings.position'),
                'no_previous' => __('sennik-prev-next::strings.no_previous'),
                'no_next'     => __('sennik-prev-next::strings.no_next'),
            ],
        ]);
    }
}
