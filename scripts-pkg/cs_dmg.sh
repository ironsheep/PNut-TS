#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

dmg_src_folder="_unzipped/macos"

# Store the original directory
original_dir=$(pwd)
changed_dir=false

# Check if the current directory is scripts-pkg
if [ "${PWD##*/}" != "scripts-pkg" ]; then
  cd scripts-pkg || { echo "${SCRIPT}: ERROR: Failed to change directory to scripts-pkg"; exit 1; }
  changed_dir=true
fi

#(set -x;codesign --sign - ${pkg_src_folder}/p2-pnut-ts-macos-arm64)
#(set -x;codesign --sign - ${pkg_src_folder}/p2-pnut-ts-macos-x64)
#(set -x;codesign --verbose=4 --options=runtime -s "Apple Distribution: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-arm64.dmg)
#(set -x;codesign --verbose=4 --options=runtime -s "Apple Distribution: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-x64.dmg)
(set -x;codesign --verbose=4 --options=runtime -s "Developer ID Application: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-arm64.dmg)
(set -x;codesign --verbose=4 --options=runtime -s "Developer ID Application: Iron Sheep Productions, LLC (T67FW2JCJW)" ${dmg_src_folder}/macos-x64.dmg)

# Change back to the original directory if we changed to scripts-pkg
if [ "$changed_dir" = true ]; then
  cd "$original_dir" || { echo "${SCRIPT}: ERROR: Failed to change back to the original directory"; exit 1; }
fi
