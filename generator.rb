`sudo npm install -g resume-cli`
`resume test`
`resume export html.html --format html --theme elegant`
`resume export pdf.pdf --format pdf --theme short`
# work around until markdown is properly supported
`resume export markdown.html --format markdown --theme markdown`
`cp html.html resume.html`
`cp pdf.pdf resume.pdf`
`cp markdown.html resume.md`
`rm html.html`
`rm pdf.pdf`
`rm markdown.html`