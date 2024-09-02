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


# add notarize steps here
current_dmg=${dmg_src_folder}/macos-x64.dmg
(set -x;xcrun notarytool submit ${current_dmg} --keychain-profile "pnut-ts-notary" --wait)
echo "xcrun stapler staple ${current_dmg}"
echo "xcrun stapler validate ${current_dmg}"
echo "# to check log do:"
echo "xcrun notarytool log '<submission-id>' --keychain-profile \"pnut-ts-notary\""

# Change back to the original directory if we changed to scripts-pkg
if [ "$changed_dir" = true ]; then
  cd "$original_dir" || { echo "${SCRIPT}: ERROR: Failed to change back to the original directory"; exit 1; }
fi
