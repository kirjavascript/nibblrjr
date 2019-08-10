let s:jspath = expand('<sfile>:p:h')
let s:help="nibblrjr command editor - o:open D:delete
         \\n-------------------------------------------------"
let s:helpLines = 2

" for add, find

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
    noremap <buffer> <silent> D :call CommandDelete()<cr>
endfunction

call CommandList() " TODO: remove

function CommandGet()
    if line('.') > s:helpLines
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
    let l:buf = join(getline(1, '$'), "\n")
    echo trim(system('node ' . s:jspath . '/set', l:name . ' ' . l:buf))
    let &modified = 0
endfunction

function CommandDelete()
    let l:name = getline('.')
    let l:choice = confirm('Are you sure you want to delete ' . l:name, "&Ok\n&Cancel")
    if line('.') > s:helpLines && l:choice == 1
        silent let l:out = trim(system('node ' . s:jspath . '/delete', l:name))
        if v:shell_error == 0
            setlocal modifiable
            normal dd
            setlocal nomodifiable
        else
            echo l:out
        endif
    endif
endfunction

" message locked / starred
" use command hash
" syntax
" ? / ~ commands
" new command -> prompt
