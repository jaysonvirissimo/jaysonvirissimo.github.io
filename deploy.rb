test_output = `npm test`

if test_output.include?('failing')
  puts 'Some tests have failed, skipping deployment.'
elsif test_output.include?('passing')
  puts 'All tests passing, deploying now...'
  `git subtree push --prefix src origin master`
else
  puts 'Something went wrong with the test run.'
end
