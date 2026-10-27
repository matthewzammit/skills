# Brand deck

A short deck (20 to 30 slides) to present the product's design to the team. Build it last, from the finished design
system and screens.

- **Slide frame:** if the company has a sales or pitch deck in Figma, copy its header, footer and page number, and fill
  it with this product's content. Otherwise make one simple frame and reuse it.
- **An outline that worked:** cover; what the product is; principles; colour; type; spacing and shapes; icons;
  components; screens; one overview slide of the main flows, then one slide per flow; motion; voice and copy;
  accessibility; where it lives (the file and the code).
- **Screen images** are PNG exports of the real frames (`exportAsync`), placed as images. A scaled-down clone breaks,
  because size variables do not scale.
- **Colour slides** can show a chosen subset of the palette; the design system page holds every colour.

## Rules

- Boxes side by side have text of the same number of lines and the same height. If one needs more words, the others
  take its height.
- No line ends with one word alone. Use a non-breaking space between the last two words.
- Small text on a dark background has enough contrast (4.5:1).
- A two-line title must not run into the content below it.
- Check every slide with `get_screenshot`.
