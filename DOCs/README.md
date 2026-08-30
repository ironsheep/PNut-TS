# PNut-TS Documentation

This directory contains comprehensive documentation for the PNut-TS SPIN2/PASM2 compiler.

## 📁 Directory Structure

### `/internals/` - Current System Documentation
Documents that explain how the existing compiler works:

**Compiler and output formats**

- **[Theory-of-Operations.md](internals/Theory-of-Operations.md)** - Comprehensive compilation flow from source files to binary output
- **[SPIN2-BIN-Format.md](internals/SPIN2-BIN-Format.md)** - Complete specification of the .bin file format and object organization
- **[MAP-File-Format.md](internals/MAP-File-Format.md)** - Specification of the `.map` file, including the instance model - read this before writing a `.map` parser
- **[Object-Cache-Theory-of-Operations.md](internals/Object-Cache-Theory-of-Operations.md)** - How the persistent object cache works: key composition, the on-disk entry, the dependency manifest, `--cache-verify`, and why every sidecar is subtree-scoped
- **[Distiller-Theory-of-Operations.md](internals/Distiller-Theory-of-Operations.md)** - How the object distillation mechanism works
- **[TECHNICAL-DEBT.md](internals/TECHNICAL-DEBT.md)** - Known debt in the compiler source

**Runtime and silicon**

- **[Spin2-Interpreter-v55-Theory-of-Operations.md](internals/Spin2-Interpreter-v55-Theory-of-Operations.md)** - How the Spin2 bytecode interpreter works
- **[SingleStep-Debugger-Theory-of-Operations.md](internals/SingleStep-Debugger-Theory-of-Operations.md)** - How the single-step debugger works
- **[Flash-Loader-Theory-of-Operations.md](internals/Flash-Loader-Theory-of-Operations.md)** - How the flash loader works
- **[PASM2-ASSEMBLY-LABELS.md](internals/PASM2-ASSEMBLY-LABELS.md)** - Assembly label conventions
- **[PLL-Clock-Mode-Selection.md](internals/PLL-Clock-Mode-Selection.md)** - Clock mode selection

**DEBUG windows**

- **[DEBUG-WINDOW-DIRECTIVE-MATRIX.md](internals/DEBUG-WINDOW-DIRECTIVE-MATRIX.md)** - Which directives each debug window accepts
- **[DEBUG-WINDOW-ToO-COMPLETENESS-AUDIT.md](internals/DEBUG-WINDOW-ToO-COMPLETENESS-AUDIT.md)** - Audit record for the window ToOs
- Per-window theories of operation live in **[internals/theory-of-operations/](internals/theory-of-operations/)** (BITMAP, FFT, LOGIC, MIDI, PLOT, SCOPE, SCOPE_XY, SPECTRO, TERM)

**Usage guides** - task-oriented guides for writing Spin2/PASM2 live in
**[internals/usage-guides/](internals/usage-guides/)** and
**[internals/usage-guides-new/](internals/usage-guides-new/)**.

**Findings and briefings** - short records aimed at documentation agents and at
the P2 Knowledge Base: DEBUG statement quoting, LUT immediate addressing, the
RDPIN C flag, XBYTE SETQ/SETQ2, WAITSEx, and several P2KB update requests. See
the directory listing.

### `/language-specification/` - PASM2/SPIN2 Language Specification Package
Complete language specification and IDE integration package for Parallax Propeller 2 development:

- **[README.md](language-specification/README.md)** - Complete language specification package overview
- **234 total language elements** extracted from PNut-TS compiler source
- **IDE integration files** for VS Code, Sublime, Atom, Vim, Emacs
- **Automated extraction pipeline** for maintaining sync with compiler changes

### `/voicing/` - How We Write What We Publish
Voice and content standards for the project's documents. Read the shared core
first; each artifact then has a short guide of its own:

- **[README.md](voicing/README.md)** - Shared core: audience, evidence-grounding, no-internals rule, voice. Applies to everything we publish
- **[Usage-Guide-Voicing.md](voicing/Usage-Guide-Voicing.md)** - The usage guides under `/internals/usage-guides*/`

### `/roadmaps/` - Future Improvement Plans
Strategic plans for architectural improvements and optimizations:

- **[Test-Suite-Punch-List.md](roadmaps/Test-Suite-Punch-List.md)** - The active punch list: everything outstanding, read at every sprint's scope call
- **[Architectural-Extraction-Roadmap.md](roadmaps/Architectural-Extraction-Roadmap.md)** - Major class extraction opportunities
- **[Compiler-Subsystem-Extraction-Roadmap.md](roadmaps/Compiler-Subsystem-Extraction-Roadmap.md)** - Subsystem extraction plan
- **[Multi-Error-Reporting-Compiler-Roadmap.md](roadmaps/Multi-Error-Reporting-Compiler-Roadmap.md)** - Reporting more than one error per compile
- **[Object-Cache-Correctness-Analysis.md](roadmaps/Object-Cache-Correctness-Analysis.md)** - The living analysis behind the cache's correctness work
- **[Object-Cache-Future-Enhancements.md](roadmaps/Object-Cache-Future-Enhancements.md)** - Cache work considered and not yet scheduled
- **[Test-Coverage-Improvement-Roadmap.md](roadmaps/Test-Coverage-Improvement-Roadmap.md)** and **[Coverage-100-Sprint-Plan.md](roadmaps/Coverage-100-Sprint-Plan.md)** - Coverage plans
- **[Dead-Code-Elimination-Opportunities-Study.md](roadmaps/Dead-Code-Elimination-Opportunities-Study.md)** - Study, not a commitment to ship
- **[P2KB-map-caveat-retraction-1.55.4.md](roadmaps/P2KB-map-caveat-retraction-1.55.4.md)** - Replacement text for an external knowledge-base entry our `.map` fix obsoleted

Completed plans, closeouts, retrospectives and dated punch-list archives move to
**[roadmaps/completed/](roadmaps/completed/)** - including the performance,
distiller-extraction and early-deduplication roadmaps that used to be listed
here.

## 🎯 Usage Guide

**Understanding the Current System:**
→ Start with `/internals/` documents to learn how the compiler works

**Planning Improvements:**
→ Review `/roadmaps/` documents for organized improvement opportunities

**Checking a document is current:** `npm run docs-check` reports which documents
cover source that has changed since they were last verified. `DOCs/doc-coverage.json`
is what it reads.