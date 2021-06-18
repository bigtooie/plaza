# /acg/ plaza

## Install instructions (Ubuntu 20.04)

Clone the repository

    $ git clone https://github.com/bigtooie/plaza --depth=1

Go to the repository directory

    $ cd plaza
    
Install dependencies

    $ ./plaza install-deps
    
Build the frontend

    $ ./plaza build
    
Start the server

    $ ./plaza start
    
## Configuration

Copy `shared/globals.ts` and `server/secret/secret.ts` to the parent directory of the repository root (outside the repository) and change the values.
