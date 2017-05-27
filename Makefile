.PHONY: all bundle zopfli brotli sizes clean mod-clean clean-all

WEBPACK_OUTPUT_DIR ?= $(PWD)/frontend-dist

BUNDLEJS = $(WEBPACK_OUTPUT_DIR)/bundle.js
BUNDLEBR = $(BUNDLEJS).br
BUNDLEGZ = $(BUNDLEJS).gz

SRC_FILES = $(shell find frontend-src -type f)
WEBPACK = $(shell npm bin)/webpack
BROTLI = $(shell which bro brotli)
ZOPFLI = $(shell which zopfli)

all: bundle brotli zopfli
bundle: $(BUNDLEJS)
zopfli: $(BUNDLEGZ)
brotli: $(BUNDLEBR)

sizes: bundle zopfli brotli
	ls -lh $(WEBPACK_OUTPUT_DIR)

$(BUNDLEJS): $(SRC_FILES) \
	webpack.config.js \
	node_modules

	env NODE_ENV=production $(WEBPACK) -p --progress --output-path $(WEBPACK_OUTPUT_DIR)

$(BUNDLEBR): $(BUNDLEJS)
	$(BROTLI) < $(BUNDLEJS) > $(BUNDLEBR)

$(BUNDLEGZ): $(BUNDLEJS)
	$(ZOPFLI) $(BUNDLEJS) -c > $(BUNDLEGZ)

node_modules: package.json yarn.lock
	yarn install
	touch -ma node_modules

clean-all: clean mod-clean

clean:
	rm -rf $(WEBPACK_OUTPUT_DIR)

mod-clean:
	rm -rf node_modules
