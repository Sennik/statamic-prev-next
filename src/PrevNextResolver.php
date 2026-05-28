<?php

namespace Sennik\PrevNext;

use Illuminate\Support\Collection as LaravelCollection;
use Statamic\Contracts\Entries\Entry;

class PrevNextResolver
{
    public function resolve(Entry $entry): array
    {
        $collection = $entry->collection();

        if (! $collection) {
            return $this->emptyResult();
        }

        return $collection->hasStructure()
            ? $this->fromTree($entry, $collection)
            : $this->fromSort($entry, $collection);
    }

    protected function fromSort(Entry $entry, $collection): array
    {
        $entries = $collection->queryEntries()
            ->where('site', $entry->locale())
            ->orderBy($collection->sortField(), $collection->sortDirection())
            ->get();

        return $this->findNeighbors($entries, $entry);
    }

    protected function fromTree(Entry $entry, $collection): array
    {
        $tree = $collection->structure()->in($entry->locale());

        if (! $tree) {
            return $this->emptyResult();
        }

        $entries = $tree->flattenedPages()
            ->map(fn ($page) => $page->entry())
            ->filter()
            ->values();

        return $this->findNeighbors($entries, $entry);
    }

    protected function findNeighbors($entries, Entry $current): array
    {
        $list = LaravelCollection::wrap($entries)->values();

        $position = null;
        foreach ($list as $index => $candidate) {
            if ($candidate->id() === $current->id()) {
                $position = $index;
                break;
            }
        }

        if ($position === null) {
            return $this->emptyResult($list->count());
        }

        return [
            'prev'     => $this->payload($list->get($position - 1)),
            'next'     => $this->payload($list->get($position + 1)),
            'position' => $position + 1,
            'total'    => $list->count(),
        ];
    }

    protected function payload($entry): ?array
    {
        if (! $entry) {
            return null;
        }

        return [
            'id'       => $entry->id(),
            'title'    => $entry->get('title') ?: $entry->slug(),
            'edit_url' => $entry->editUrl(),
        ];
    }

    protected function emptyResult(int $total = 0): array
    {
        return [
            'prev'     => null,
            'next'     => null,
            'position' => 0,
            'total'    => $total,
        ];
    }
}
