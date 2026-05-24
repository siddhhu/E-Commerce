export function PromoBanner() {
    return (
        <div className="w-full bg-[#c8e6c9] text-green-900 py-2.5 px-4 text-center text-sm font-medium">
            <span className="font-bold">NEW! Wholesaler Tier 2 Pricing Unlocked.</span>{' '}
            <span className="hidden sm:inline">| Use Code: </span>
            <span className="font-bold hidden sm:inline">SUMMER50</span>
            <span className="hidden sm:inline"> for Retail Deals.</span>
        </div>
    );
}
