#things shared across multiple routes/modules
#functions to inyect to other functions ( a:int = Depends(b) )
#for example, a function to determine if current user is admin
# this function then would be inyected to an only admin fun
# would give error in case of current user isn't admin
#-inyectable fun for pagination
#-ratelimiter fun
#-database conection fun