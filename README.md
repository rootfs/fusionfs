# fusionfs

## Installation
Install node.js, redis, redis3m, cmake 2.8 (or higher), fuse library, boost 1.57, Apache thrift..

## Compile
   cd src
   make
## Run
   Start meta server: 
   mkdir -p /tmp/test
   src/meta_data/fusionfs /tmp/test
   
   Start osd on the localhost:
   mkdir -p /tmp/osd
   cd src/thrift; node osd.js
