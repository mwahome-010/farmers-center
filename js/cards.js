document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('guideModal');
    var modalTitle = document.getElementById('guideModalTitle');
    var modalImage = document.getElementById('guideModalImage');
    var modalDetails = document.getElementById('guideModalDetails');
    var closeBtn = document.getElementById('guideModalClose');

    function openModalFromCard(card) {
        var titleEl = card.querySelector('h3');
        var imgEl = card.querySelector('img');
        var detailEls = card.querySelectorAll('h2, p');

        modalTitle.textContent = titleEl ? titleEl.textContent : '';
        if (imgEl) {
            modalImage.src = imgEl.getAttribute('src');
            modalImage.alt = imgEl.getAttribute('alt') || (titleEl ? titleEl.textContent : '');
        } else {
            modalImage.removeAttribute('src');
            modalImage.alt = '';
        }

        modalDetails.innerHTML = '';
        detailEls.forEach(function (el) {
            var clone = el.cloneNode(true);
            clone.classList.add('modal-detail-item');
            modalDetails.appendChild(clone);
        });

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.guide-card').forEach(function (card) {
        card.addEventListener('click', function () {
            openModalFromCard(card);
        });
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
});