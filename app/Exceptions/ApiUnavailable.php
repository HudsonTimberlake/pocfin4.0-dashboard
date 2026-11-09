<?php

namespace App\Exceptions;

use RuntimeException;

/** The API couldn't be reached, or answered with a server error. */
class ApiUnavailable extends RuntimeException {}
