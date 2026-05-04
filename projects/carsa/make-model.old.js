<!-- Make/Model selection -->
<script>
  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push([
    'list',
    (listInstances) => {
    // TODO - LIMIT TO MODELS LIST ONLY
      const modelList = listInstances.find(({ instance }) => instance === 'models');
      if (!modelList) return;
      initMakeModelFilters();
      // On any render - call the function
      modelList.addHook('render', () => {
        initMakeModelFilters();
      });
    }
  ]);

  function initMakeModelFilters() {
    // Get an element on the page that has each model/make
    const items = $('.model-data').map(function () {
      return {
        model: $(this).attr('model-title'),
        make: $(this).attr('make-title')
      };
    }).get();
    // Get the make + model, if none found return
    const $makeDropdown = $('[name="make"]');
    const $modelDropdown = $('[name="model"]');
    if (!$makeDropdown.length || !$modelDropdown.length) return;

    //This removes change event handlers and sets the values. Makes models disabled\
    //TODO - if we have make / model in query params set here, remove duplication from later
    // Logic should be: If query params set that. If not set to any.
    $makeDropdown.off('change').html('<option value="" selected>Any</option>');
    $modelDropdown.off('change').html('<option value="">Any</option>')
      .prop('disabled', true)
      .addClass('is-disabled');

    // Goes through all the list of models, gets the makes, uniques them.
    const uniqueMakes = [...new Set(items.map(i => i.make))].sort();
    uniqueMakes.forEach(make => {
      $makeDropdown.append(`<option value="${make}">${make}</option>`);
    });

    // Function to set dropdowns from URL parameters
    function setDropdownsFromURL() {
      const urlParams = new URLSearchParams(window.location.search);
      const makeParam = urlParams.get('cars_make_equal');
      const modelParam = urlParams.get('cars_model_equal');

      if (makeParam) {
        $makeDropdown.val(makeParam);
        $makeDropdown[0].dispatchEvent(new Event('change', { bubbles: true }));

        // Populate model dropdown for the selected make
        const filtered = items.filter(i => i.make === makeParam);
        if (filtered.length) {
          $modelDropdown.html('<option value="">Any</option>')
            .prop('disabled', false)
            .removeClass('is-disabled');
          filtered.forEach(i =>
            $modelDropdown.append(`<option value="${i.model}">${i.model}</option>`)
          );

          // Set the model value if it exists
          if (modelParam) {
            $modelDropdown.val(modelParam);
            $modelDropdown[0].dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }

    // Set dropdowns from URL on page load
    setDropdownsFromURL();

    $makeDropdown.on('change', function () {
      const selectedMake = this.value;
      const filtered = items.filter(i => i.make === selectedMake);
      // Clear only the model filter when make changes
      const tagRemoveButtons = document.querySelectorAll('[fs-list-element="tag-remove"]');

      // Get all the tag remove buttons, go up the chain to the tag, and if the tag value matches, click it
      tagRemoveButtons.forEach((button) => {
        const tagElement = button.closest('[fs-list-element="tag"]');
        if (tagElement) {
          const tagValue = tagElement.querySelector('[fs-list-element="tag-value"]');
          if (tagValue) {
            const value = tagValue.textContent.trim();

            // Check if this tag value exists in the model dropdown options
            const isModelTag = $modelDropdown.find(`option[value="${value}"]`).length > 0;
            if (isModelTag) {
              if (!isMobile()) {
                button.click();
              }
            }
          }
        }
      });

      // Clear the field value as backup
      $modelDropdown.val('').trigger('input').trigger('change');

      // if no make selected, make model dropdown not clickable
      if (!filtered.length) {
        $modelDropdown.html('<option value="">Any</option>')
          .prop('disabled', true)
          .addClass('is-disabled');
        return;
      }
      // if make selected, prepopulate model dropdown with models
      // TODO - create a function to prepopulate models field. Is used twice
      $modelDropdown.html('<option value="">Any</option>')
        .prop('disabled', false)
        .removeClass('is-disabled');
      filtered.forEach(i =>
        $modelDropdown.append(`<option value="${i.model}">${i.model}</option>`)
      );
    });

    $modelDropdown.on('change', function () {
      // placeholder, if needed later
    });
  }
</script>
