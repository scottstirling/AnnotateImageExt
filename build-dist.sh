#!/bin/bash

NAME=AnnotateImageExt
BUILD_DIR=./build
DIST_DIR=./dist
DATE=`date +%F` # yyyy-mm-dd
TGZ_FILENAME="${DATE}-${NAME}.tar.gz"

mkdir -vp $BUILD_DIR/doc/scripts/$NAME
mkdir -vp $BUILD_DIR/src/scripts/$NAME

#TODO: update for AnnotateImageExt
cp -vR src/scripts/${NAME}/ etc/*.xsgn README.md LICENSE ${BUILD_DIR}/src/scripts/${NAME}/
cp -rv doc/scripts/${NAME}/*.html ${BUILD_DIR}/doc/scripts/${NAME}/

tar -C ${BUILD_DIR} -czvf ${TGZ_FILENAME} doc/ src/

echo "sha1sum ${TGZ_FILENAME}: `sha1sum ${TGZ_FILENAME}`"

mkdir -vp ${DIST_DIR}
mv ${TGZ_FILENAME} ${DIST_DIR}/
cp -v etc/updates.xri ${DIST_DIR}/

echo "Build and distribution file creation done."
