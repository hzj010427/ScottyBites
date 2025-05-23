import BusinessUtils from '../../../server/utils/businessUtils';

describe("BusinessUtils tests", () => {
    beforeAll(() => {
    });

    beforeEach(() => {
    });

    test("Should successful clean category", () => {
        const category = ["Chinese", "inValid Category", "American"];
        const cleanedCategory = BusinessUtils.cleanCategory(category);
        expect(cleanedCategory).toEqual(["Chinese", "American"]);
    });

    test("Should successful clean location", async () => {
        const locationOutsidePittsburgh = "New York, NY";
        const cleanedLocationOutsidePittsburgh = await BusinessUtils.cleanLocation(locationOutsidePittsburgh);
        expect(cleanedLocationOutsidePittsburgh).toBe("");
    });




});