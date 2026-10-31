# Conventions

Simplicity wins. A smaller solution that does the job beats a rule carried over from an older design.

- Keep files small and on one job. Split a file when it is hard to read in one sitting.
- Prefer few dependencies. Each one needs a reason. Use Node and the browser before adding a package.
- Do not add an abstraction before a second real use. A few duplicated lines are fine.
- Write plain TypeScript. Skip classes, generic frameworks, and wrappers unless a library requires them.
- Delete unused code before adding more. Do not leave speculative hooks, options, or empty layers.
- Name things for what they are. Comment only where the next reader would otherwise guess wrong.
- Check outside input at the edge that receives it. One check is enough.
- Test behavior that can break, against disposable data. Skip a new test harness for a one-line change.
- Stay one package and one server process until a real limit says otherwise.
