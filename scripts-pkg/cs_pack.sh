#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

pkg_src_folder="../pkgs"
extras_dist_folder="_dist"
build_folder="_unzipped"

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
(set -x;codesign --verbose=4 --options=runtime -s "Developer ID Application: Iron Sheep Productions, LLC (T67FW2JCJW)" ${pkg_src_folder}/p2-pnut-ts-macos-arm64)
(set -x;codesign --verbose=4 --options=runtime -s "Developer ID Application: Iron Sheep Productions, LLC (T67FW2JCJW)" ${pkg_src_folder}/p2-pnut-ts-macos-x64)

# prepare macos x64
dist_folder="${build_folder}/macos/macos-x64"
rm -rf ${dist_folder}/*
mkdir -p ${dist_folder}/pnut_ts
(set -x;cp -p ${pkg_src_folder}/p2-pnut-ts-macos-x64 ${dist_folder}/pnut_ts/pnut_ts)
(set -x;cp -pr ${extras_dist_folder}/* ${dist_folder}/pnut_ts)
# prepare macos arm64
dist_folder="${build_folder}/macos/macos-arm64"
rm -rf ${dist_folder}/*
mkdir -p ${dist_folder}/pnut_ts
(set -x;cp -p ${pkg_src_folder}/p2-pnut-ts-macos-arm64 ${dist_folder}/pnut_ts/pnut_ts)
(set -x;cp -pr ${extras_dist_folder}/* ${dist_folder}/pnut_ts)
# prepare Windows x64
dist_folder="${build_folder}/win/win-x64"
rm -rf ${dist_folder}/*
mkdir -p ${dist_folder}/pnut_ts
(set -x;cp -p ${pkg_src_folder}/p2-pnut-ts-win-x64.exe ${dist_folder}/pnut_ts/pnut_ts.exe)
(set -x;cp -pr ${extras_dist_folder}/* ${dist_folder}/pnut_ts)
# prepare Windows arm64
dist_folder="${build_folder}/win/win-arm64"
rm -rf ${dist_folder}/*
mkdir -p ${dist_folder}/pnut_ts
(set -x;cp -p ${pkg_src_folder}/p2-pnut-ts-win-arm64.exe ${dist_folder}/pnut_ts/pnut_ts.exe)
(set -x;cp -pr ${extras_dist_folder}/* ${dist_folder}/pnut_ts)
# prepare Linux x64
dist_folder="${build_folder}/linux/linux-x64"
rm -rf ${dist_folder}/*
mkdir -p ${dist_folder}/pnut_ts
(set -x;cp -p ${pkg_src_folder}/p2-pnut-ts-linux-arm64 ${dist_folder}/pnut_ts/pnut_ts)
(set -x;cp -pr ${extras_dist_folder}/* ${dist_folder}/pnut_ts)
# prepare Linux arm64
dist_folder="${build_folder}/linux/linux-arm64"
rm -rf ${dist_folder}/*
mkdir -p ${dist_folder}/pnut_ts
(set -x;cp -p ${pkg_src_folder}/p2-pnut-ts-linux-arm64 ${dist_folder}/pnut_ts/pnut_ts)
(set -x;cp -pr ${extras_dist_folder}/* ${dist_folder}/pnut_ts)

# Change back to the original directory if we changed to scripts-pkg
if [ "$changed_dir" = true ]; then
  cd "$original_dir" || { echo "${SCRIPT}: ERROR: Failed to change back to the original directory"; exit 1; }
fi
