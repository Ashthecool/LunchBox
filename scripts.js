var currentPage = '1'

ImmediateshiftPage(currentPage)

function shiftPage(newPage){
    console.log('shifting page', newPage)
    const Oldpage = document.querySelector('#page' + currentPage)
    Oldpage.classList.remove('show')
    currentPage = newPage
    setTimeout(() => {
    const nP = document.querySelector('#page' + currentPage)
    nP.classList.add('show')
    }, 1000);
    
}

function ImmediateshiftPage(newPage){
    console.log('shifting page', newPage)
    const Oldpage = document.querySelector('#page' + currentPage)
    Oldpage.classList.remove('show')
    currentPage = newPage
    const nP = document.querySelector('#page' + currentPage)
    nP.classList.add('show')
    
}