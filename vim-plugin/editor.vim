" make filetype

let s:jspath = expand("<sfile>:p:h")
let s:help="nibblrjr command editor - use o to open a command\n
\-------------------------------------------------"

enew
put=s:help
keepjumps normal ggddG
execute 'read! node ' . s:jspath . '/list'
keepjumps normal gg
let &modified = 0

noremap <buffer> <silent> o :call CommandGet()<cr>

function CommandGet()
    if line('.') > 2
        let l:name = getline('.')
        enew
        set filetype=javascript
        let l:out = system("node " . s:jspath . '/get', l:name)
        put=l:out
        keepjumps normal ggdd
        let &modified = 0
        autocmd! BufWriteCmd <buffer> call CommandSet(l:name)
    endif
endfunction

function CommandSet(name)
    echo name
endfunction

" message locked / starred
" syntax
" get write event
