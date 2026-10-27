// Example config for figma-diff.js. Copy it to figma-sync.config.js in your repo root and edit it.
// Every path below is relative to the repo root. The names here belong to an invented app: replace them.
//
// A rule maps a changed file to the Figma section that draws it. Section names must match the section
// (or frame group) names on your Figma "Screens" page, so the weekly drift check can find each one.

module.exports = {
  // Where the record of the last synced commit lives (JSON). Created by `figma-diff.js --mark`.
  record: 'figma-sync.json',

  // Git pathspecs (plain folders) to diff. Anything outside them is never reported.
  uiPaths: ['src/app', 'src/features', 'src/components', 'src/theme'],

  // How to list screens: a git pathspec to list files under, and a regex that marks a file as a screen.
  // Expo Router: every .tsx under src/app is a screen. Next.js app router: use /(^|\/)page\.tsx$/ instead.
  routeFiles: {
    pathspec: 'src/app',
    screen: /^src\/app\/.*\.tsx$/,
  },

  // Which file extensions count as UI. Other changed files (docs, json, images) are skipped.
  uiFile: /\.(tsx?|jsx?)$/,

  // Files that are never synced and never reported: labs, tests, layouts, API routes.
  ignore: [
    /^src\/app\/(lab|design)\//,
    /-lab\.tsx$/,
    /^src\/app\/api\//,
    /\.(test|spec)\.tsx?$/,
    /(^|\/)(_layout|layout)\.tsx$/,
  ],

  // [regex, [section names]]. The FIRST matching rule wins, so put narrow rules above broad ones.
  // A rule may name several sections when one area is drawn in more than one place.
  rules: [
    [/^src\/app\/\(auth\)\/|^src\/features\/auth\//, ['Sign in']],
    [/^src\/app\/\(tabs\)\/home\.tsx$|^src\/features\/home\//, ['Home']],
    // Narrow before broad: billing pages live under settings but get their own section.
    [/^src\/app\/settings\/billing\/|^src\/features\/billing\//, ['Billing']],
    [/^src\/app\/settings(\/|\.tsx$)|^src\/features\/settings\//, ['Settings']],
    [/^src\/app\/team\/|^src\/features\/team\//, ['Team: list', 'Team: member detail']],
    // Shared components and tokens land on the design system section.
    [/^src\/components\/|^src\/theme\//, ['Design System']],
  ],

  // The section name a shared component or token change maps to (it must appear in a rule above).
  // It is left out of the list of sections the weekly check expects on the Screens page.
  designSystem: 'Design System',

  // Full screens with no route of their own (a gate, an overlay, a modal host) that the route check cannot
  // see. `frame` is a regex the weekly check looks for as a frame name in Figma.
  overlays: [
    { file: 'src/features/offline/OfflineScreen.tsx', frame: /no connection|offline/i },
    { file: 'src/features/auth/LockScreen.tsx', frame: /^App lock/ },
  ],
};
