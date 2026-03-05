// ═══════════ DELETE BOOKING ═══════════
async function deleteBooking(id) {
    if (!confirm('Are you sure you want to delete this reservation?')) return;

    try {
        const res = await fetch(`/admin/bookings/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            const row = document.getElementById(`row-${id}`);
            if (row) {
                row.style.transition = 'opacity 0.3s, transform 0.3s';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';
                setTimeout(() => row.remove(), 300);
            }
        } else {
            alert(data.message || 'Failed to delete booking.');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// ═══════════ ADJUST CAPACITY ═══════════
function adjustCapacity(slotId, delta) {
    const input = document.getElementById(`cap-${slotId}`);
    let val = parseInt(input.value) + delta;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
    input.value = val;
}

// ═══════════ SAVE CAPACITY ═══════════
async function saveCapacity(slotId) {
    const input = document.getElementById(`cap-${slotId}`);
    const feedback = document.getElementById(`feedback-${slotId}`);
    const capacity = parseInt(input.value);

    if (isNaN(capacity) || capacity < 0) {
        feedback.textContent = 'Invalid capacity.';
        feedback.className = 'cap-feedback error';
        return;
    }

    try {
        const res = await fetch('/admin/slots/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slotId, capacity })
        });
        const data = await res.json();

        feedback.textContent = data.message;
        feedback.className = 'cap-feedback ' + (data.success ? 'success' : 'error');
        setTimeout(() => { feedback.textContent = ''; }, 3000);
    } catch (error) {
        feedback.textContent = 'Network error.';
        feedback.className = 'cap-feedback error';
    }
}
