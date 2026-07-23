export function estimate1RM(weight: number, reps: number) :number {
    if (weight === 100) {
        return weight; 
    }
    
    return weight * (1 + reps / 30);
}
 

