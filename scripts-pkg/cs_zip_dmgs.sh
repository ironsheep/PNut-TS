#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

#              v1.43.0
BUILD_VERSION="014300"

# Store the original directory
original_dir=$(pwd)
changed_dir=false

# Check if the current directory is scripts-pkg
if [ "${PWD##*/}" != "scripts-pkg" ]; then
  cd scripts-pkg || { echo "${SCRIPT}: ERROR: Failed to change directory to scripts-pkg"; exit 1; }
  changed_dir=true
fi


arm64_dmg="_unzipped/macos/macos-arm64.dmg"
x64_dmg="_unzipped/macos/macos-x64.dmg"
arm64_zip="_UPLOAD/macos-arm64-${BUILD_VERSION}.zip"
x64_zip="_UPLOAD/macos-x64-${BUILD_VERSION}.zip"

(set -x;ditto -ck --norsrc "$arm64_dmg" "$arm64_zip")
(set -x;ditto -ck --norsrc "$x64_dmg" "$x64_zip")


# Change back to the original directory if we changed to scripts-pkg
if [ "$changed_dir" = true ]; then
  cd "$original_dir" || { echo "${SCRIPT}: ERROR: Failed to change back to the original directory"; exit 1; }
fi
