.PHONY: all bundle zopfli brotli sizes favicon clean mod-clean clean-all

BUILD_DIR ?= $(PWD)/frontend-dist
WEBPACK_OUTPUT_DIR ?= $(BUILD_DIR)/webpack

BUNDLEJS = $(WEBPACK_OUTPUT_DIR)/bundle.js
BUNDLEBR = $(BUNDLEJS).br
BUNDLEGZ = $(BUNDLEJS).gz

FAVICON_SRC = skillboards/static/skillboards/crokinole-logo.svg
FAVICON = $(BUILD_DIR)/favicon.png

SRC_FILES = $(shell find frontend2 -type f)
WEBPACK = $(shell npm bin)/webpack
BROTLI = $(shell which bro brotli)
ZOPFLI = $(shell which zopfli)
CONVERT_SVG = $(shell npm bin)/svgexport

all: bundle brotli zopfli favicon
bundle: $(BUNDLEJS)
zopfli: $(BUNDLEGZ)
brotli: $(BUNDLEBR)
favicon: $(FAVICON)

sizes: bundle zopfli brotli
	ls -lh $(WEBPACK_OUTPUT_DIR)

$(BUNDLEJS): $(SRC_FILES) webpack.config.js node_modules | $(WEBPACK_OUTPUT_DIR)
	env NODE_ENV=production $(WEBPACK) -p --progress --output-path $(WEBPACK_OUTPUT_DIR)

$(BUNDLEBR): $(BUNDLEJS)
	$(BROTLI) < $(BUNDLEJS) > $(BUNDLEBR)

$(BUNDLEGZ): $(BUNDLEJS)
	$(ZOPFLI) $(BUNDLEJS) -c > $(BUNDLEGZ)

node_modules: package.json yarn.lock
	yarn install
	touch -ma node_modules

$(FAVICON): $(FAVICON_SRC) node_modules | $(BUILD_DIR)
	$(CONVERT_SVG) $(FAVICON_SRC) $(FAVICON)

$(BUILD_DIR):
	mkdir $(BUILD_DIR)
	touch -ma $(BUILD_DIR)

$(WEBPACK_OUTPUT_DIR): | $(BUILD_DIR)
	mkdir $(WEBPACK_OUTPUT_DIR)
	touch -ma $(WEBPACK_OUTPUT_DIR)

clean-all: clean mod-clean

clean:
	rm -rf $(BUILD_DIR)

mod-clean:
	rm -rf node_modules
