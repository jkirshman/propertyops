import { describe, expect, it } from "vitest";

import { compareExpectedToActual } from "./expected-vs-actual";

const FURNACE = "furnace-id";
const HVAC = "hvac-id";
const WATER_HEATER = "water-heater-id";
const EXTRA = "extra-id";

const catalogNamesById = new Map([
  [FURNACE, "Furnace"],
  [HVAC, "Rooftop HVAC Unit"],
  [WATER_HEATER, "Water Heater"],
  [EXTRA, "Sump Pump"],
]);

describe("compareExpectedToActual", () => {
  it("marks a required item present when actual meets expected quantity", () => {
    const rows = compareExpectedToActual({
      templateItems: [{ equipmentCatalogItemId: FURNACE, expectedQuantity: 1, isRequired: true }],
      actualCountsByCatalogItemId: new Map([[FURNACE, 1]]),
      catalogNamesById,
    });
    expect(rows).toEqual([
      {
        equipmentCatalogItemId: FURNACE,
        catalogName: "Furnace",
        isRequired: true,
        expectedQuantity: 1,
        actualQuantity: 1,
        status: "expected_present",
      },
    ]);
  });

  it("marks a required item missing when there is zero actual quantity", () => {
    const rows = compareExpectedToActual({
      templateItems: [{ equipmentCatalogItemId: FURNACE, expectedQuantity: 1, isRequired: true }],
      actualCountsByCatalogItemId: new Map(),
      catalogNamesById,
    });
    expect(rows[0].status).toBe("expected_missing");
    expect(rows[0].actualQuantity).toBe(0);
  });

  it("marks a required item partial when actual is below expected but nonzero", () => {
    const rows = compareExpectedToActual({
      templateItems: [{ equipmentCatalogItemId: HVAC, expectedQuantity: 2, isRequired: true }],
      actualCountsByCatalogItemId: new Map([[HVAC, 1]]),
      catalogNamesById,
    });
    expect(rows[0].status).toBe("expected_partial");
  });

  it("treats an optional item the same way but with optional_* statuses", () => {
    const present = compareExpectedToActual({
      templateItems: [{ equipmentCatalogItemId: WATER_HEATER, expectedQuantity: 1, isRequired: false }],
      actualCountsByCatalogItemId: new Map([[WATER_HEATER, 1]]),
      catalogNamesById,
    });
    expect(present[0].status).toBe("optional_present");

    const missing = compareExpectedToActual({
      templateItems: [{ equipmentCatalogItemId: WATER_HEATER, expectedQuantity: 1, isRequired: false }],
      actualCountsByCatalogItemId: new Map(),
      catalogNamesById,
    });
    expect(missing[0].status).toBe("optional_missing");
  });

  it("flags installed equipment with no template item as extra", () => {
    const rows = compareExpectedToActual({
      templateItems: [],
      actualCountsByCatalogItemId: new Map([[EXTRA, 1]]),
      catalogNamesById,
    });
    expect(rows).toEqual([
      {
        equipmentCatalogItemId: EXTRA,
        catalogName: "Sump Pump",
        isRequired: false,
        expectedQuantity: 0,
        actualQuantity: 1,
        status: "extra",
      },
    ]);
  });

  it("does not report an untemplated catalog item with zero actual quantity", () => {
    const rows = compareExpectedToActual({
      templateItems: [],
      actualCountsByCatalogItemId: new Map([[EXTRA, 0]]),
      catalogNamesById,
    });
    expect(rows).toEqual([]);
  });

  it("handles a property with no template and no installed equipment", () => {
    expect(
      compareExpectedToActual({
        templateItems: [],
        actualCountsByCatalogItemId: new Map(),
        catalogNamesById,
      }),
    ).toEqual([]);
  });
});
