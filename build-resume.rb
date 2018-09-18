puts 'Cloning markdown-resume repo...'
`git clone https://github.com/there4/markdown-resume.git`

puts 'Installing PHP and Composer...'
`brew install php71 composer`

puts 'Installing dependencies...'
`(cd markdown-resume; brew cask install wkhtmltopdf; gem install wkhtmltopdf; composer install)`

puts 'Building resume documents...'
`cp src/documents/resume.md markdown-resume/examples/source/resume-candidate.md`
`(cd markdown-resume; ./bin/md2resume html examples/source/resume-candidate.md examples/output/)`
`mv markdown-resume/examples/output/resume-candidate.html src/documents/resume.html`

puts 'Done!'
