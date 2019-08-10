let s:jspath = expand('<sfile>:p:h')
let s:help="nibblrjr command editor - use o to open a command\n
\-------------------------------------------------"

" command NibblrList call CommandList()

function CommandList()
    enew
    put=s:help
    keepjumps normal ggddG
    silent execute 'read! node ' . s:jspath . '/list'
    keepjumps normal gg

    let &modified = 0
    setlocal buftype=nofile
    setlocal noswapfile
    setlocal nowrap
    setlocal nomodifiable
    noremap <buffer> <silent> o :call CommandGet()<cr>
endfunction

call CommandList() " TODO: remove

function CommandGet()
    if line('.') > 2
        let l:name = getline('.')

        if bufwinnr(l:name) > 0
            enew
            silent execute 'file ' . l:name
        else
            silent execute 'edit ' . l:name
            keepjumps normal ggdG
        endif

        put = system('node ' . s:jspath . '/get', l:name)
        keepjumps normal ggdd
        let &modified = 0
        set filetype=javascript
        set buftype=acwrite
        setlocal noswapfile
        autocmd! BufWriteCmd <buffer> call CommandSet()
    endif
endfunction

function CommandSet()
    let l:name = expand('%')
    let l:buf=join(getline(1, '$'), "\n")
    echo system('node ' . s:jspath . '/set', l:name . ' ' . l:buf)
    echo 'Saved ' . l:name
    let &modified = 0
endfunction

" message locked / starred
" use command hash
" syntax
" new command -> prompt
