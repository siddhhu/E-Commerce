'use client';

import { memo, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function CountdownTimerInner() {
    const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 12, seconds: 59 });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                let { hours, minutes, seconds } = prev;
                if (hours === 0 && minutes === 0 && seconds === 0) {
                    return { hours: 4, minutes: 0, seconds: 0 };
                }

                if (seconds > 0) {
                    seconds -= 1;
                } else {
                    seconds = 59;
                    if (minutes > 0) {
                        minutes -= 1;
                    } else {
                        minutes = 59;
                        hours -= 1;
                    }
                }
                return { hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm md:text-base font-bold tracking-wider text-white shadow-md">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-rose-400" />
            <span>
                Ends in: {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
            </span>
        </div>
    );
}

export const CountdownTimer = memo(CountdownTimerInner);
