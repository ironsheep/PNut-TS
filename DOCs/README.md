# PNut-TS Documentation

This directory contains comprehensive documentation for the PNut-TS SPIN2/PASM2 compiler.

## 📁 Directory Structure

### `/internals/` - Current System Documentation
Documents that explain how the existing compiler works:

- **[SPIN2-BIN-Format.md](internals/SPIN2-BIN-Format.md)** - Complete specification of the .bin file format and object organization
- **[Object-Cache-Theory-of-Operations.md](internals/Object-Cache-Theory-of-Operations.md)** - How the persistent object cache works: key composition, the on-disk entry, the dependency manifest, and `--cache-verify`
- **[MAP-File-Format.md](internals/MAP-File-Format.md)** - Specification of the `.map` file, including the instance model - read this before writing a `.map` parser
- **[Theory-of-Operations.md](internals/Theory-of-Operations.md)** - Comprehensive compilation flow from source files to binary output
- **[Distiller-Theory-of-Operations.md](internals/Distiller-Theory-of-Operations.md)** - How the object distillation mechanism works

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

- **[Architectural-Extraction-Roadmap.md](roadmaps/Architectural-Extraction-Roadmap.md)** - 9 major class extraction opportunities (180-280 hours)
- **[Performance-Analysis-and-Optimization-Roadmap.md](roadmaps/Performance-Analysis-and-Optimization-Roadmap.md)** - Comprehensive performance optimization strategy (180-350 hours)
- **[Distiller-Extraction-Roadmap.md](roadmaps/Distiller-Extraction-Roadmap.md)** - Plan to complete distiller class extraction (44-64 hours)
- **[Early-Deduplication-Fix-Plan.md](roadmaps/Early-Deduplication-Fix-Plan.md)** - Fix for the disabled early deduplication pass (30-44 hours)

## 🎯 Usage Guide

**Understanding the Current System:**
→ Start with `/internals/` documents to learn how the compiler works

**Planning Improvements:**
→ Review `/roadmaps/` documents for organized improvement opportunities

**Total Improvement Effort:** ~600+ hours across all roadmaps
**Expected Benefits:** 60%+ compilation speed improvement, 50%+ memory reduction, significantly improved maintainability