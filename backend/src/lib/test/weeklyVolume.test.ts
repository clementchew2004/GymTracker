import { it, expect, describe } from "vitest";
import { weeklyVolume } from "../weeklyVolume.js";

describe(weeklyVolume, () => {
  it("returns an empty object when sets is empty", () => {
    const sets = {};
    expect(weeklyVolume([])).toEqual({});
  });

  it("sums volume for a single set", () => {
    const set = [{ weight: 60, reps: 10, muscleGroup: "chest" }];
    expect(weeklyVolume(set)).toEqual({ chest: 600 });
  });

  it("sums multiple sets in a single muscle group", () => {
    const set = [{weight: 60, reps: 10, muscleGroup: "chest"}, 
                 {weight: 70, reps: 8, muscleGroup: "chest"},
                 {weight: 80, reps: 6, muscleGroup: "chest"}
                ];
    expect(weeklyVolume(set)).toEqual({ chest : 1640 });
  });

  it('sum a single set with multiple muscle group', () => {
    const set = [{weight : 60, reps: 10, muscleGroup: "chest"}, 
                 {weight : 40, reps: 10, muscleGroup: "back"},
                 {weight : 100, reps: 10, muscleGroup: "leg"}
                ];
    expect(weeklyVolume(set)).toEqual({chest : 600, back : 400, leg : 1000});
  });
});
