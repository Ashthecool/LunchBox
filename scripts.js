var currentPage = '#page1'

shiftPage(currentPage)

function shiftPage(newPage){
    const Oldpage = document.querySelector(currentPage)
    Oldpage.classList.remove('show')
    currentPage = newPage
    const nP = document.querySelector(currentPage)
    nP.classList.add('show')
    
}