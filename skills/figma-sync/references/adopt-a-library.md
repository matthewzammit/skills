# Move a mirror onto a design team's library

Use this when the design team has a component library, and the mirror should use its components and variables instead
of a design system of its own. The mirror still shows the product as shipped. Where the code and the library differ,
the code wins in Figma, and the difference goes to the design team as a question.

Before step 1, check access. Ask for it if it is missing; never build around it. The Figma tool's library list can
miss a library published in the same team. Importing a component, variable or style by its key still works, so test one
import by key before you call the library unavailable.

Read [build-rules.md](build-rules.md) first. Load Figma's `figma-use` skill before any `use_figma` call.

## 1. Map

Make one table: each of the mirror's components, variants, text styles and variables, beside the library's match, and
what does not match by value.

Compare resolved values, not names. A text style named Regular can resolve to a different font face (for example
Book). Check which font file the product's code really loads before you swap a text style. Keep the parts and values
where the code and the library differ, and list them for the design team.

Done when: every part of the mirror's design system has a row (library part, or still ours and why), and the person
has approved the table.

## 2. Colours

Alias each matching variable to the library's, per mode. Alias to the library's single-mode source variables (the ones
its light and dark variables point to), not to its multi-mode variable. That one resolves in the library's default
mode, so it shows the wrong colour on a dark page.

Library components follow the library's own mode collection. A dark page must set that collection's mode too.

Done when: one page reads right in light and in dark, checked with a screenshot of each.

## 3. Pilot

Swap the top-level copies on one small page. Take before and after screenshots in light and dark. The person approves
them before you go on.

Done when: the person has approved the pilot pictures.

## 4. App components

Swap the nested part inside each of the mirror's own components, so every copy updates at once.

1. Before you change any main component, read and save every copy's props and visible text. Get the copies from
   `getInstancesAsync`. It includes copies nested in other components and in slot content; a page scan misses slot
   content. A nested copy's id is the copy id, a ";", then the nested node id (`I<copy>;<nested>`).
2. Do the swap.
3. Set each copy's props back, then compare its visible text with the saved text. Stop on any difference.

Done when: every copy's props are back and its visible text matches the saved text.

## 5. Other pages

Run the same script on the remaining top-level copies, one page per batch. Check each page in light and dark before the
next.

Done when: no page has a top-level copy of a part the library replaced.

## 6. Clean up

1. Delete the mirror's own components only when they have no copies left. Then recount once: a deleted part may have
   held copies of another.
2. Mark the old design system page as replaced: a banner that links the library, and a short status note per section
   (linked, replaced, or still ours and why).
3. Update the sync record and the drift check's map, so a code part points to the library part.

Done when: the recount shows no copies of anything deleted, the page is marked, and the next drift check maps each code
part to the library.

## 7. Differences

Put each difference between the code and the library as a comment pinned on the exact spot in Figma, for the design
team to answer ("library or code?"). Write them all first. Show the person the exact text, and post only after they say
go.

Mentioning someone who is not in the file makes Figma ask to share the file with them. Stop and ask the person first.

Done when: the person has said go and each comment is posted, or the person has said none.

## Traps

- A custom brand font that the server-side Figma tool cannot load blocks every text change on a library part. Run those
  writes in the person's browser, in the open Figma file's console (the page's `figma` object), with the fonts loaded
  first.
- A run in the browser is not undone on an error. Read everything before you change anything, and make each script safe
  to run twice. Undo in that tab reverts every console change since the tab opened, in one step, so use it only as a
  full rollback. Any navigation reloads the page and drops what the script defined.
- Library components often carry a bound max width (from a Tailwind `max-w` class). Unbind it where the mirror's part is
  wider.
- A swap keeps slot content whose layer names match. Clean each slot after a swap.
- Copy only visible text. Hidden text layers and unused text props carry stale defaults (for example, a field in its
  hint state still has a default value prop).
- Read the real content of each part before you swap it. A part may hide its own letters and lay an icon on top, or
  colour itself through overrides. Carry those across.
- Library checkboxes and similar small parts may come in at the library's demo size. Set the size back.
