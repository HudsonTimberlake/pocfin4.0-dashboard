<x-layouts.plain title="Can’t reach PocFin">
    <div class="hero flex flex-col gap-3 p-9">
        <h1 class="text-[26px] font-extrabold">We can’t reach PocFin right now</h1>
        <p class="text-[15.5px] leading-[23px] text-slate">Your budget is safe. Try again in a minute.</p>
        <a href="{{ url()->current() }}" class="btn mt-2">Try again</a>
    </div>
</x-layouts.plain>
