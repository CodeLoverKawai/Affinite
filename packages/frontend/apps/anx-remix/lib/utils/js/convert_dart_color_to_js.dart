String convertDartColorToJs(String dartColor) {
  // convert color from AARRGGBB to RRGGBBAA
  if (dartColor.length < 8) {
    return dartColor;
  }
  String alpha = dartColor.substring(0, 2);
  String rgb = dartColor.substring(2);
  if (alpha.toLowerCase() == 'ff') {
    return rgb;
  }
  return rgb + alpha;
}
