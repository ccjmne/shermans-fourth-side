import { animationFrameScheduler, defer, map, Observable, scheduled, SchedulerLike, takeWhile, timer } from 'rxjs';

function over(duration = 1000, scheduler: SchedulerLike = animationFrameScheduler): Observable<number> {
  return defer(() => {
    const start = scheduler.now();
    return scheduled([timer(0), duration], scheduler).pipe(
      map(() => (scheduler.now() - start) / duration),
      takeWhile(t => t < 1),
    );
  });
}

over(1000).subscribe(console.log);
