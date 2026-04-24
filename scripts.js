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

//--------------dataset opirate---------------
//lav en ref til din collection
var quotesRef = db.collection('lunchID')

function setup(){
    //nu komer det genital onsnapshot
    quotesRef.onSnapshot( snap => {
        console.log('modtog snap', snap.size)
        // ryd qoutes div og sæt de nye quotes ind
        select('#userName').html('');
        // Call showQuotes til at vise de ny quotes
        showQuotes(snap);
    })
}

function Submit(){
    var q = select('#userName').value()
    if(q == ""){
        confirm('write ur name')
        return
    }
    var x = select('#PAC').value()
    if(x == ""){
        confirm('Select what you are')
        return
    }
    //now we will store the new quote
    //makes a new collectin that does not find
    quotesRef.add({
        userName: q,
        PAC: x,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
        //.then calles when getting add is not done
    }).then(
        console.log('Quote stored in database', q)
    )

    
    
}