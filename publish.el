;;; publish.el --- Build the glocean.dev blog from Org -*- lexical-binding: t; -*-

(require 'org)
(require 'ox-html)
(require 'cl-lib)
(require 'subr-x)
(require 'json)
(require 'url-util)

(defconst gl-root
  (file-name-directory (or load-file-name buffer-file-name default-directory)))
(defconst gl-posts-dir (expand-file-name "posts" gl-root))
(defconst gl-blog-dir  (expand-file-name "writing" gl-root))
(defconst gl-site-url  "https://glocean.dev")

(setq org-export-with-section-numbers nil
      org-export-with-toc nil
      org-export-with-author nil
      org-export-with-title nil
      org-html-htmlize-output-type nil
      org-html-doctype "html5")

;; --- export backend ---

(defun gl-headline (headline contents info)
  (let* ((level (org-export-get-relative-level headline info))
         (tag (format "h%d" (min (1+ level) 6)))
         (title (org-export-data (org-element-property :title headline) info)))
    (concat (format "<%s>%s</%s>\n" tag title tag) (or contents ""))))

(defun gl-section (_section contents _info)
  (or contents ""))

(defun gl-code-block (element _contents _info)
  (format "<pre><code>%s</code></pre>"
          (org-html-encode-plain-text
           (org-remove-indentation (or (org-element-property :value element) "")))))

(org-export-define-derived-backend 'gl-html 'html
  :translate-alist '((headline . gl-headline)
                     (section . gl-section)
                     (src-block . gl-code-block)
                     (example-block . gl-code-block)))

;; --- helpers ---

(defun gl-esc (s)
  (setq s (or s ""))
  (dolist (p '(("&" . "&amp;") ("<" . "&lt;") (">" . "&gt;")) s)
    (setq s (replace-regexp-in-string (regexp-quote (car p)) (cdr p) s t t))))

(defun gl-fmt-date (time)
  (string-trim (replace-regexp-in-string "  +" " " (format-time-string "%b %e, %Y" time))))

(defun gl-rfc822 (time)
  (format-time-string "%a, %d %b %Y %H:%M:%S %z" time))

(defun gl-kw (kws name)
  (cadr (assoc name kws)))

(defun gl-parse-date (s)
  (when (and s (string-match "\\([0-9]\\{4\\}-[0-9]\\{2\\}-[0-9]\\{2\\}\\)" s))
    (date-to-time (match-string 1 s))))

(defun gl-parse-tags (s)
  (when (and s (not (string-empty-p (string-trim s))))
    (if (string-match-p ":" s)
        (split-string s ":" t "[ \t]+")
      (split-string s "[ ,]+" t))))

(defun gl-strip-markup (s)
  (let ((s (replace-regexp-in-string "\\[\\[[^]]*\\]\\[\\([^]]*\\)\\]\\]" "\\1" s)))
    (replace-regexp-in-string "\\[\\[\\([^]]*\\)\\]\\]" "\\1"
                              (replace-regexp-in-string "[*=~]" "" s))))

(defun gl-first-paragraph ()
  (save-excursion
    (goto-char (point-min))
    (let (lines done)
      (while (and (not done) (not (eobp)))
        (let ((line (string-trim (or (thing-at-point 'line t) ""))))
          (cond
           ((string-empty-p line) (when lines (setq done t)))
           ((string-prefix-p "#+" line))
           ((string-prefix-p "#" line))
           ((string-prefix-p "*" line))
           (t (push line lines))))
        (forward-line 1))
      (when lines
        (gl-strip-markup (string-join (nreverse lines) " "))))))

;; --- readers ---

(defun gl-read-post (file)
  (with-temp-buffer
    (insert-file-contents file)
    (let ((org-inhibit-startup t)) (org-mode))
    (let* ((kws (org-collect-keywords
                 '("TITLE" "DATE" "FILETAGS" "TAGS" "EXCERPT" "DESCRIPTION" "SLUG")))
           (title (or (gl-kw kws "TITLE") (file-name-base file)))
           (slug  (or (gl-kw kws "SLUG") (file-name-base file)))
           (time  (or (gl-parse-date (gl-kw kws "DATE")) (current-time)))
           (tags  (or (gl-parse-tags (gl-kw kws "FILETAGS"))
                      (gl-parse-tags (gl-kw kws "TAGS"))))
           (wc    (count-words (point-min) (point-max)))
           (read  (max 1 (round (/ wc 200.0))))
           (excerpt (string-trim
                     (or (gl-kw kws "EXCERPT") (gl-kw kws "DESCRIPTION")
                         (gl-first-paragraph) "")))
           (body  (string-trim (org-export-as 'gl-html nil nil t))))
      (list :title title :slug slug :time time :tags (or tags '())
            :read read :excerpt excerpt :body body))))

;; --- writers ---

(defun gl-fmt-short-date (time)
  (string-trim (replace-regexp-in-string "  +" " " (format-time-string "%b %e" time))))

(defun gl-meta-html (p)
  (let ((tags (plist-get p :tags)))
    (concat
     "<span class=\"meta\">"
     (format "<span>%s</span>" (gl-fmt-date (plist-get p :time)))
     (format "<span>%s min read</span>" (plist-get p :read))
     (if (null tags) ""
       (format "<span class=\"tags\">%s</span>" (gl-esc (string-join tags ", "))))
     "</span>")))

(defun gl-tag-links (tags)
  (mapconcat (lambda (tg)
               (format "<a href=\"/writing/?tag=%s\">%s</a>"
                       (url-hexify-string tg) (gl-esc tg)))
             tags ", "))

(defun gl-post-meta-html (p)
  (let ((tags (plist-get p :tags)))
    (concat
     "<div class=\"meta\">"
     (format "<span>%s</span>" (gl-fmt-date (plist-get p :time)))
     (format "<span>%s min read</span>" (plist-get p :read))
     (if (null tags) "" (format "<span>%s</span>" (gl-tag-links tags)))
     "</div>")))

(defun gl-post-end-html (p)
  (let ((tags (plist-get p :tags)))
    (concat
     "<div class=\"post-end\">"
     (if (null tags) "<span></span>"
       (format "<span class=\"filed\">filed under <span>%s</span></span>" (gl-tag-links tags)))
     "<a class=\"accent\" href=\"/writing/\">all writing</a>"
     "</div>")))

(defconst gl-post-template
  "<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Glocean - %s</title>
  <script>(function(){var e=document.documentElement;e.className+=' js';try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')e.setAttribute('data-theme',t);}catch(n){}})();</script>
  <style>html{color-scheme:dark;background:#1f1a24}@media(prefers-color-scheme:light){html:not([data-theme=dark]){color-scheme:light;background:#f1ecf7}}html[data-theme=light]{color-scheme:light;background:#f1ecf7}</style>
  <meta name=\"theme-color\" content=\"#c4b5e3\">
  <meta property=\"og:title\" content=\"Glocean - %s\">
  <meta property=\"og:image\" content=\"https://glocean.dev/assets/og.png\">
  <meta name=\"twitter:card\" content=\"summary_large_image\">
  <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/assets/favicon-32.png\">
  <link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"/assets/favicon-16.png\">
  <link rel=\"apple-touch-icon\" href=\"/assets/favicon-180.png\">
  <link rel=\"alternate\" type=\"application/rss+xml\" title=\"Glocean - writing\" href=\"/feed.xml\">
  <link rel=\"preload\" href=\"/fonts/glocean-dot.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>
  <link rel=\"stylesheet\" href=\"/css/style.css\">
</head>
<body data-page=\"post\">
  <div class=\"root\">
    <canvas class=\"meadow\" aria-hidden=\"true\"></canvas>

    <div class=\"wrap\">
      <header class=\"top\">
        <div class=\"wordmark\">
          <a href=\"/\" aria-label=\"glocean, home\"><canvas width=\"72\" height=\"18\"></canvas></a>
          <button type=\"button\" aria-label=\"pick a petal\"></button>
        </div>
        <nav class=\"nav\">
          <a class=\"active\" href=\"/writing/\">writing</a>
          <a href=\"/made/\">made</a>
          <a href=\"/meadow/\">meadow</a>
          <a href=\"/friends/\">friends</a>
          <a href=\"/about/\">about</a>
        </nav>
      </header>

      <div class=\"fade\">
        <main>
          <article class=\"post\">
            <h1>%s</h1>
            %s
            <div class=\"prose\">
%s
            </div>
            %s
          </article>
        </main>
        <div class=\"floor\" aria-hidden=\"true\"></div>
      </div>

      <footer class=\"foot\">
        <a href=\"https://github.com/gloceandotdev\" target=\"_blank\" rel=\"noopener\">github</a>
        <span class=\"muted\">email</span>
        <a href=\"/feed.xml\">rss</a>
        <button type=\"button\" class=\"theme\" hidden>light mode</button>
      </footer>
    </div>

    <canvas class=\"fall\" aria-hidden=\"true\"></canvas>
  </div>

  <script src=\"/js/meadow.js\"></script>
  <script src=\"/js/site.js\"></script>
</body>
</html>
")

(defun gl-post-html (p)
  (format gl-post-template
          (gl-esc (plist-get p :title))
          (gl-esc (plist-get p :title))
          (gl-esc (plist-get p :title))
          (gl-post-meta-html p)
          (plist-get p :body)
          (gl-post-end-html p)))

(defun gl-write-post (p)
  (let* ((dir (expand-file-name (plist-get p :slug) gl-blog-dir))
         (file (expand-file-name "index.html" dir)))
    (make-directory dir t)
    (write-region (gl-post-html p) nil file)
    (princ (format "  -> writing/%s/\n" (plist-get p :slug)))))

;; --- index ---

(defun gl-post-row (p)
  (concat
   (format "<a class=\"post-row\" href=\"/writing/%s/\" data-tags=\"%s\">"
           (plist-get p :slug) (gl-esc (string-join (plist-get p :tags) " ")))
   (gl-meta-html p)
   (format "<h2 class=\"row-title\">%s</h2>" (gl-esc (plist-get p :title)))
   (let ((e (plist-get p :excerpt)))
     (if (string-empty-p e) "" (format "<p class=\"row-desc\">%s</p>" (gl-esc e))))
   "</a>"))

(defun gl-count-label (n)
  (if (= n 1) "1 post" (format "%d posts" n)))

(defun gl-filter-bar (posts)
  (let ((tags (sort (delete-dups
                     (apply #'append
                            (mapcar (lambda (p) (copy-sequence (plist-get p :tags))) posts)))
                    #'string<)))
    (concat "<div class=\"filter\">"
            (if (null tags) ""
              (concat "<button class=\"active\" data-tag=\"\">all</button>"
                      (mapconcat (lambda (tg)
                                   (format "<button data-tag=\"%s\">%s</button>"
                                           (gl-esc tg) (gl-esc tg)))
                                 tags "")))
            (format "<span class=\"count\">%s</span>" (gl-count-label (length posts)))
            "</div>")))

(defun gl-index-block (posts)
  (if (null posts)
      (concat (gl-filter-bar posts)
              "\n            <p class=\"empty\">No posts yet :(</p>")
    (concat (gl-filter-bar posts)
            "\n            "
            (mapconcat #'gl-post-row posts "\n            ")
            "\n            <p class=\"empty\" hidden>Nothing under that tag yet.</p>")))

(defun gl-write-index (posts)
  (let ((file (expand-file-name "index.html" gl-blog-dir))
        (start "<!-- POSTS:START -->")
        (end "<!-- POSTS:END -->"))
    (with-temp-buffer
      (insert-file-contents file)
      (goto-char (point-min))
      (unless (re-search-forward
               (concat (regexp-quote start) "\\(?:.\\|\n\\)*?" (regexp-quote end)) nil t)
        (error "POSTS markers not found in %s" file))
      (replace-match (concat start "\n            " (gl-index-block posts) "\n            " end) t t)
      (write-region (point-min) (point-max) file))))

(defun gl-latest-html (posts)
  (if (null posts) ""
    (let ((p (car posts)))
      (concat
       "<div class=\"latest\"><span class=\"muted\">latest</span>"
       (format "<a class=\"accent\" href=\"/writing/%s/\">%s</a>"
               (plist-get p :slug) (gl-esc (plist-get p :title)))
       (format "<span class=\"muted\">%s</span>" (gl-fmt-short-date (plist-get p :time)))
       "</div>"))))

(defun gl-write-latest (posts)
  (let ((file (expand-file-name "index.html" gl-root))
        (start "<!-- LATEST:START -->")
        (end "<!-- LATEST:END -->"))
    (with-temp-buffer
      (insert-file-contents file)
      (goto-char (point-min))
      (unless (re-search-forward
               (concat (regexp-quote start) "\\(?:.\\|\n\\)*?" (regexp-quote end)) nil t)
        (error "LATEST markers not found in %s" file))
      (replace-match (concat start "\n            " (gl-latest-html posts) "\n            " end) t t)
      (write-region (point-min) (point-max) file))))

;; --- search ---

(defun gl-post-alist (p)
  (list (cons "title" (plist-get p :title))
        (cons "date" (gl-fmt-date (plist-get p :time)))
        (cons "url" (concat "/writing/" (plist-get p :slug) "/"))
        (cons "slug" (plist-get p :slug))
        (cons "read" (format "%s min read" (plist-get p :read)))
        (cons "excerpt" (plist-get p :excerpt))
        (cons "tags" (apply #'vector (plist-get p :tags)))))

(defun gl-write-posts-js (posts)
  (let ((file (expand-file-name "js/posts.js" gl-root))
        (json (json-encode (apply #'vector (mapcar #'gl-post-alist posts)))))
    (write-region (concat "window.BLOG_POSTS = " json ";\n") nil file)))

;; --- RSS feed ---

(defun gl-rss-item (p)
  (format "  <item>
    <title>%s</title>
    <link>%s/writing/%s/</link>
    <guid>%s/writing/%s</guid>
    <pubDate>%s</pubDate>
    <description>%s</description>
  </item>\n"
          (gl-esc (plist-get p :title))
          gl-site-url (plist-get p :slug)
          gl-site-url (plist-get p :slug)
          (gl-rfc822 (plist-get p :time))
          (gl-esc (plist-get p :excerpt))))

(defun gl-write-feed (posts)
  (let ((file (expand-file-name "feed.xml" gl-root)))
    (write-region
     (concat
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
      "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n<channel>\n"
      "  <title>Glocean - writing</title>\n"
      (format "  <link>%s/writing/</link>\n" gl-site-url)
      (format "  <atom:link href=\"%s/feed.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n" gl-site-url)
      "  <description>Glocean's personal blog</description>\n"
      "  <language>en</language>\n"
      (format "  <lastBuildDate>%s</lastBuildDate>\n" (gl-rfc822 (current-time)))
      (mapconcat #'gl-rss-item posts "")
      "</channel>\n</rss>\n")
     nil file)))

;; -- main ---

(defun gl-publish ()
  (let* ((files (directory-files gl-posts-dir t "\\.org\\'"))
         (posts (sort (mapcar #'gl-read-post files)
                      (lambda (a b) (time-less-p (plist-get b :time) (plist-get a :time))))))
    (mapc #'gl-write-post posts)
    (gl-write-posts-js posts)
    (gl-write-feed posts)
    (gl-write-index posts)
    (gl-write-latest posts)
    (princ (format "Published %d post(s).\n" (length posts)))))

(gl-publish)
;;; publish.el ends here
