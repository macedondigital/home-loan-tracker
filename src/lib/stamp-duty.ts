// VIC land transfer (stamp) duty, standard owner-occupier rates.
//
// Will has owned three previous properties, so no First Home Buyer exemption or
// concession applies. The PPR concession only applies under $550k, below his
// target range. The Family Home Guarantee is a federal deposit/LMI scheme and
// does not affect duty. Full standard duty is charged at every price point.
//
// Reference values: $650k -> $34,070, $700k -> $37,070, $750k -> $40,070.
export function calcStampDuty(propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  if (propertyValue <= 25000) return propertyValue * 0.014;
  if (propertyValue <= 130000) return 350 + (propertyValue - 25000) * 0.024;
  if (propertyValue <= 960000) return 2870 + (propertyValue - 130000) * 0.06;
  return 55670 + (propertyValue - 960000) * 0.055;
}
