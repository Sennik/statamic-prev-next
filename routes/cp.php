<?php

use Illuminate\Support\Facades\Route;
use Sennik\PrevNext\Http\Controllers\NavController;

Route::get('prev-next/{collection}/{entry}', [NavController::class, 'show'])
    ->name('sennik.prev-next.show');
