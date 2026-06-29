;;; publish.el --- Build the glocean.dev blog from Org -*- lexical-binding: t; -*-

(require 'org)
(require 'ox-html)
(require 'cl-lib)
(require 'subr-x)
(require 'json)

(defconst gl-root
  (file-name-directory (or load-file-name buffer-file-name default-directory)))
(defconst gl-posts-dir (expand-file-name "posts" gl-root))
(defconst gl-blog-dir  (expand-file-name "blog" gl-root))
(defconst gl-site-url  "https://glocean.dev")

(setq org-export-with-section-numbers nil
      org-export-with-toc nil
      org-export-with-author nil
      org-export-with-title nil
      org-html-htmlize-output-type nil
      org-html-doctype "html5")

;; --- helpers ---

(defun gl-esc (s)
  (setq s (or s ""))
  (dolist (p '(("&" . "&amp;") ("<" . "&lt;") (">" . "&gt;")) s)
    (setq s (replace-regexp-in-string (regexp-quote (car p)) (cdr p) s t t))))

(defun gl-attr (s)
  (replace-regexp-in-string "\"" "&quot;" (gl-esc s) t t))

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
           (body  (string-trim (org-export-as 'html nil nil t))))
      (list :title title :slug slug :time time :tags (or tags '())
            :read read :excerpt excerpt :body body))))

;; --- writers ---

(defun gl-tags-html (p)
  (let ((tags (plist-get p :tags)))
    (if (null tags) ""
      (concat "<div class=\"tags\">"
              (mapconcat (lambda (tg) (format "<span class=\"tag\">%s</span>" (gl-esc tg))) tags "")
              "</div>"))))

(defun gl-meta-tags-html (p)
  (let ((tags (plist-get p :tags)))
    (if (null tags) ""
      (concat "\n          <span class=\"sep\"></span>\n          <span class=\"meta-tags\">"
              (mapconcat (lambda (tg)
                           (format "<a class=\"meta-tag\" href=\"/blog?tag=%s\">%s</a>"
                                   (url-hexify-string tg) (gl-esc tg)))
                         tags "")
              "</span>"))))

(defun gl-nav-html (newer older)
  (if (not (or newer older)) ""
    (concat
     "<div class=\"post-nav\">"
     (if newer (format "<a href=\"/blog/%s\">← %s</a>" (plist-get newer :slug) (gl-esc (plist-get newer :title))) "<span></span>")
     (if older (format "<a href=\"/blog/%s\">%s →</a>" (plist-get older :slug) (gl-esc (plist-get older :title))) "<span></span>")
     "</div>")))

(defconst gl-post-template
  "<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>%s · Glocean</title>
  <script>(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
  <link rel=\"icon\" type=\"image/svg+xml\" id=\"favicon\" href=\"../../favicon.svg\">
  <meta name=\"theme-color\" content=\"#191724\" media=\"(prefers-color-scheme: dark)\">
  <meta name=\"theme-color\" content=\"#faf4ed\" media=\"(prefers-color-scheme: light)\">
  <meta name=\"description\" content=\"%s\">
  <link rel=\"alternate\" type=\"application/rss+xml\" title=\"Glocean — Blog\" href=\"/feed.xml\">
  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
  <link href=\"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap\" rel=\"stylesheet\">
  <link rel=\"stylesheet\" href=\"../../css/style.css\">
</head>
<body data-page=\"blog\">
  <div class=\"layout\">
    <aside class=\"sidebar\" id=\"sidebar\"></aside>
    <main class=\"content\">
      <article class=\"content-inner narrow\">
        <a class=\"back-link\" href=\"/blog\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M19 12H5M11 6l-6 6 6 6\"/></svg>Back to blog</a>
        <h1 class=\"post-head-title\">%s</h1>
        <div class=\"post-meta\">
          <span class=\"date\">%s</span>
          <span class=\"sep\"></span>
          <span class=\"read\">%s min read</span>%s
        </div>
        <div class=\"prose\">
%s
        </div>
        %s
      </article>
    </main>
  </div>
  <script src=\"../../js/flower.js\"></script>
  <script src=\"../../js/posts.js\"></script>
  <script src=\"../../js/site.js\"></script>
</body>
</html>
")

(defun gl-post-html (p newer older)
  (format gl-post-template
          (gl-esc (plist-get p :title))
          (gl-attr (plist-get p :excerpt))
          (gl-esc (plist-get p :title))
          (gl-fmt-date (plist-get p :time))
          (plist-get p :read)
          (gl-meta-tags-html p)
          (plist-get p :body)
          (gl-nav-html newer older)))

(defun gl-write-post (p newer older)
  (let* ((dir (expand-file-name (plist-get p :slug) gl-blog-dir))
         (file (expand-file-name "index.html" dir)))
    (make-directory dir t)
    (write-region (gl-post-html p newer older) nil file)
    (princ (format "  -> blog/%s/\n" (plist-get p :slug)))))

;; --- index ---

(defun gl-post-row (p)
  (concat
   (format "<a class=\"post-row\" href=\"/blog/%s\" data-tags=\"%s\">"
           (plist-get p :slug) (gl-esc (string-join (plist-get p :tags) " ")))
   "<div class=\"post-meta\">"
   (format "<span class=\"date\">%s</span><span class=\"sep\"></span><span class=\"read\">%s min read</span>"
           (gl-fmt-date (plist-get p :time)) (plist-get p :read))
   "</div>"
   (format "<h2 class=\"post-title\">%s</h2>" (gl-esc (plist-get p :title)))
   (let ((e (plist-get p :excerpt)))
     (if (string-empty-p e) "" (format "<p class=\"post-excerpt\">%s</p>" (gl-esc e))))
   (gl-tags-html p)
   "</a>"))

(defun gl-filter-bar (posts)
  (let ((tags (sort (delete-dups
                     (apply #'append
                            (mapcar (lambda (p) (copy-sequence (plist-get p :tags))) posts)))
                    #'string<)))
    (if (null tags) ""
      (concat "<div class=\"tag-filter\">"
              "<button class=\"tagchip active\" data-tag=\"\">all</button>"
              (mapconcat (lambda (tg)
                           (format "<button class=\"tagchip\" data-tag=\"%s\">%s</button>"
                                   (gl-esc tg) (gl-esc tg)))
                         tags "")
              "</div>\n        "))))

(defun gl-index-block (posts)
  (if (null posts)
      "<div class=\"empty-state\">\n          <p>No posts yet :(</p>\n        </div>"
    (concat (gl-filter-bar posts)
            "<div class=\"post-list\">\n          "
            (mapconcat #'gl-post-row posts "\n          ")
            "\n        </div>")))

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
      (replace-match (concat start "\n        " (gl-index-block posts) "\n        " end) t t)
      (write-region (point-min) (point-max) file))))

;; --- search ---

(defun gl-post-alist (p)
  (list (cons "title" (plist-get p :title))
        (cons "date" (gl-fmt-date (plist-get p :time)))
        (cons "url" (concat "/blog/" (plist-get p :slug)))
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
    <link>%s/blog/%s</link>
    <guid>%s/blog/%s</guid>
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
      "  <title>Glocean — Blog</title>\n"
      (format "  <link>%s/blog</link>\n" gl-site-url)
      (format "  <atom:link href=\"%s/feed.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n" gl-site-url)
      "  <description>Writing &amp; notes by Glocean.</description>\n"
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
    (cl-loop for rest on posts
             for i from 0
             do (gl-write-post (car rest)
                               (when (> i 0) (nth (1- i) posts))
                               (cadr rest)))
    (gl-write-posts-js posts)
    (gl-write-feed posts)
    (gl-write-index posts)
    (princ (format "Published %d post(s).\n" (length posts)))))

(gl-publish)
;;; publish.el ends here
