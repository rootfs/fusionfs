THRIFT=/usr/local/bin/thrift
NODE=/usr/bin/node
all: js_thrift cpp_thrift meta_server

meta_server: 
	cd meta_data; cmake ./; make

cpp_thrift:
	cd meta_data; ${THRIFT} --gen cpp ../thrift/rpc.thrift
js_thrift:
	cd thrift;${THRIFT} --gen js:node rpc.thrift

test_thrift_osd: js_thrift
	cd thrift; ${NODE} osd.js

test_thrift_client: js_thrift
	cd thrift; ${NODE} client.js
