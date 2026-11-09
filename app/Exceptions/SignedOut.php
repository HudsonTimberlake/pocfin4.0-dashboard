<?php

namespace App\Exceptions;

use RuntimeException;

/** The API no longer accepts this sign-in (expired, signed out elsewhere, or the account is gone). */
class SignedOut extends RuntimeException {}
