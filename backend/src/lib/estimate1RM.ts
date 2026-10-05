export function estimate1RM(weight: number, reps: number) :number {
    // A single rep already IS a 1-rep max — don't extrapolate from it.
    // Epley would otherwise inflate it by 3.3%.
    if (reps === 1) {
        return weight;
    }

    return weight * (1 + reps / 30);
}
 

