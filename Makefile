.PHONY: publish serve

publish:
	emacs --batch -Q -l publish.el

serve:
	python3 -m http.server 8000
