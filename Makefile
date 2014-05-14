
test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha -R spec

.PHONY: test
