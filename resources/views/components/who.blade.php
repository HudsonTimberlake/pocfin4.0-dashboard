@props(['member' => null, 'members' => []])
@php
    $index = $member ? array_search($member['id'], array_keys($members), true) : false;
@endphp
@if ($member && count($members) > 1)
    <span class="who who-{{ $index === false ? 0 : $index % 4 }}" title="{{ $member['name'] }}">{{ initials($member['name']) }}<span class="sr-only"> {{ $member['name'] }}</span></span>
@endif
