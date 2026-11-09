<?php

namespace App\Exceptions;

use RuntimeException;

/** An admin route answered admin_code_required: this sign-in hasn't passed the emailed code. */
class AdminCodeRequired extends RuntimeException {}
