document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('guideModal');
    var modalTitle = document.getElementById('guideModalTitle');
    var modalImage = document.getElementById('guideModalImage');
    var modalDetails = document.getElementById('guideModalDetails');
    var closeBtn = document.getElementById('guideModalClose');
    var downloadBtn = document.getElementById('guideModalDownload');

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

    document.querySelectorAll('.disease-guide-card').forEach(function (card) {
        card.addEventListener('click', function () {
            openModalFromCard(card);
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
    }

    /* PDF download */
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function () {
            if (!modal) return;
            var content = document.createElement('div');
            var title = modalTitle ? modalTitle.textContent.trim() : 'Guide';
            content.style.padding = '16px';
            content.style.maxWidth = '800px';
            var heading = document.createElement('h2');
            heading.textContent = title;
            var imgClone = modalImage && modalImage.src ? modalImage.cloneNode(true) : null;
            if (imgClone) {
                imgClone.style.maxWidth = '100%';
                imgClone.style.borderRadius = '8px';
                imgClone.style.margin = '8px 0';
            }
            var detailsClone = modalDetails ? modalDetails.cloneNode(true) : document.createElement('div');
            detailsClone.querySelectorAll('button').forEach(function (b) { b.remove(); });
            content.appendChild(heading);
            if (imgClone) content.appendChild(imgClone);
            content.appendChild(detailsClone);

            var opt = {
                margin: 10,
                filename: (title || 'guide') + '.pdf',
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            if (window.html2pdf) {
                window.html2pdf().set(opt).from(content).save();
            } else {
                alert('PDF library failed to load. Please try again.');
            }
        });
    }
});
export default {};