export type SetForVolume = {
    weight: number;
    reps: number;
    muscleGroup: string;
}

export type VolumeByMuscleGroup = Record<string, number>;

export function weeklyVolume(sets: SetForVolume []) :VolumeByMuscleGroup {
    const result: VolumeByMuscleGroup = {}; 
    
    for (const set of sets) {
        const contribution = set.weight * set.reps 
        const current = result[set.muscleGroup] ?? 0 
        result[set.muscleGroup] = current + contribution; 
    }
    
    return result; 
}